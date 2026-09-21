using DepreciationService.Data;
using DepreciationService.Documents;
using DepreciationService.Models;
using DepreciationService.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using System.Net.Http.Headers;

namespace DepreciationService.Controllers;

[ApiController]
[Route("api/depreciacion")]
[Authorize]
public class DepreciationController : ControllerBase
{
    private readonly DepreciationCalculator _calculator;
    private readonly AssetServiceClient _assetServiceClient;
    private readonly DepreciationDbContext _context;

    public DepreciationController(
        DepreciationCalculator calculator,
        AssetServiceClient assetServiceClient,
        DepreciationDbContext context)
    {
        _calculator = calculator;
        _assetServiceClient = assetServiceClient;
        _context = context;
    }

    private bool TryGetToken(
        out string token)
    {
        token = string.Empty;

        var authorization =
            Request.Headers.Authorization.ToString();

        if (string.IsNullOrWhiteSpace(
            authorization))
        {
            return false;
        }

        if (!AuthenticationHeaderValue.TryParse(
            authorization,
            out var header))
        {
            return false;
        }

        if (!string.Equals(
            header.Scheme,
            "Bearer",
            StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (string.IsNullOrWhiteSpace(
            header.Parameter))
        {
            return false;
        }

        token = header.Parameter;

        return true;
    }

    private async Task<
        (
            ActivoResponse? Activo,
            List<Depreciacion> Detalle,
            int PeriodosSolicitados
        )>
        EnsureDepreciation(
            int activoId,
            DateTime fechaHasta,
            string token)
    {
        var activo =
            await _assetServiceClient.GetActivo(
                activoId,
                token
            );

        if (activo == null)
        {
            return (
                null,
                new List<Depreciacion>(),
                0
            );
        }

        if (
            fechaHasta.Date <
            activo.FechaCompra.Date
        )
        {
            throw new ArgumentException(
                "La fecha hasta no puede ser anterior a la fecha de compra."
            );
        }

        var periodosSolicitados =
            _calculator.CalculateCompleteMonths(
                activo.FechaCompra,
                fechaHasta
            );

        if (periodosSolicitados == 0)
        {
            return (
                activo,
                new List<Depreciacion>(),
                0
            );
        }

        var existentes =
            await _context.Depreciaciones
                .Where(
                    d =>
                        d.ActivoId ==
                        activo.Id
                )
                .OrderBy(
                    d =>
                        d.NumeroPeriodo
                )
                .ToListAsync();

        var ultimoPeriodo =
            existentes.Count == 0
                ? 0
                : existentes.Max(
                    d =>
                        d.NumeroPeriodo
                );

        if (
            ultimoPeriodo <
            periodosSolicitados
        )
        {
            var detalleCalculado =
                _calculator.Calculate(
                    activo.CostoAdquisicion,
                    activo.FechaCompra,
                    activo.VidaUtilMeses,
                    activo.ValorResidualPorcentaje,
                    periodosSolicitados
                );

            var periodosNuevos =
                detalleCalculado
                    .Where(
                        d =>
                            d.Periodo >
                            ultimoPeriodo
                    )
                    .Select(
                        d =>
                            new Depreciacion
                            {
                                ActivoId =
                                    activo.Id,
                                NumeroPeriodo =
                                    d.Periodo,
                                Fecha =
                                    d.Fecha.Date,
                                VD =
                                    d.VD,
                                UDA =
                                    d.UDA,
                                VR =
                                    d.VR
                            }
                    )
                    .ToList();

            if (periodosNuevos.Count > 0)
            {
                _context.Depreciaciones
                    .AddRange(periodosNuevos);

                await _context.SaveChangesAsync();
            }
        }

        var detalle =
            await _context.Depreciaciones
                .Where(
                    d =>
                        d.ActivoId ==
                        activo.Id &&
                        d.NumeroPeriodo <=
                        periodosSolicitados
                )
                .OrderBy(
                    d =>
                        d.NumeroPeriodo
                )
                .AsNoTracking()
                .ToListAsync();

        return (
            activo,
            detalle,
            periodosSolicitados
        );
    }

    [HttpPost("calcular")]
    public async Task<IActionResult> Calcular(
        [FromBody] DepreciationRequest request)
    {
        if (request.ActivoId <= 0)
        {
            return BadRequest(
                "El ID del activo debe ser mayor que cero."
            );
        }

        if (!TryGetToken(out var token))
        {
            return Unauthorized(
                "No se proporcionó un token JWT válido."
            );
        }

        if (request.FechaHasta == default)
        {
            return BadRequest(
                "La fecha hasta es obligatoria."
            );
        }

        ActivoResponse? activo;

        try
        {
            activo =
                await _assetServiceClient.GetActivo(
                    request.ActivoId,
                    token
                );

            if (activo == null)
            {
                return NotFound(
                    "Activo no encontrado o no pertenece al usuario."
                );
            }

            if (
                request.FechaHasta.Date <
                activo.FechaCompra.Date
            )
            {
                return BadRequest(
                    "La fecha hasta no puede ser anterior a la fecha de compra."
                );
            }

            var resultado =
                await EnsureDepreciation(
                    request.ActivoId,
                    request.FechaHasta,
                    token
                );

            activo =
                resultado.Activo;

            if (activo == null)
            {
                return NotFound(
                    "Activo no encontrado o no pertenece al usuario."
                );
            }

            if (
                resultado.PeriodosSolicitados ==
                0
            )
            {
                return Ok(
                    new
                    {
                        mensaje =
                            "No existen meses completos de depreciación para la fecha indicada.",
                        ActivoId =
                            activo.Id,
                        NombreActivo =
                            activo.Nombre,
                        activo.CostoAdquisicion,
                        activo.FechaCompra,
                        activo.Categoria,
                        activo.VidaUtilMeses,
                        activo.ValorResidualPorcentaje,
                        FechaHasta =
                            request.FechaHasta.Date,
                        PeriodosGenerados = 0,
                        Detalle =
                            resultado.Detalle
                    }
                );
            }

            var valorResidual =
                Math.Round(
                    activo.CostoAdquisicion *
                    activo.ValorResidualPorcentaje /
                    100m,
                    2
                );

            var valorDepreciable =
                Math.Round(
                    activo.CostoAdquisicion -
                    valorResidual,
                    2
                );

            var depreciacionMensual =
                Math.Round(
                    valorDepreciable /
                    activo.VidaUtilMeses,
                    2
                );

            return Ok(
                new
                {
                    mensaje =
                        "Depreciación calculada correctamente.",
                    ActivoId =
                        activo.Id,
                    NombreActivo =
                        activo.Nombre,
                    activo.CostoAdquisicion,
                    activo.FechaCompra,
                    activo.Categoria,
                    activo.VidaUtilMeses,
                    activo.ValorResidualPorcentaje,
                    FechaHasta =
                        request.FechaHasta.Date,
                    PeriodosSolicitados =
                        resultado.PeriodosSolicitados,
                    ValorResidual =
                        valorResidual,
                    ValorDepreciable =
                        valorDepreciable,
                    DepreciacionMensual =
                        depreciacionMensual,
                    PeriodosGenerados =
                        resultado.Detalle.Count,
                    Detalle =
                        resultado.Detalle
                }
            );
        }
        catch (ArgumentException ex)
        {
            return BadRequest(
                ex.Message
            );
        }
    }

    [HttpGet("activo/{activoId}")]
    public async Task<IActionResult> GetByActivo(
        int activoId,
        [FromQuery] DateTime? fechaHasta)
    {
        if (activoId <= 0)
        {
            return BadRequest(
                "El ID del activo debe ser mayor que cero."
            );
        }

        if (!TryGetToken(out var token))
        {
            return Unauthorized(
                "No se proporcionó un token JWT válido."
            );
        }

        var activo =
            await _assetServiceClient.GetActivo(
                activoId,
                token
            );

        if (activo == null)
        {
            return NotFound(
                "Activo no encontrado o no pertenece al usuario."
            );
        }

        if (fechaHasta.HasValue)
        {
            if (
                fechaHasta.Value.Date <
                activo.FechaCompra.Date
            )
            {
                return BadRequest(
                    "La fecha hasta no puede ser anterior a la fecha de compra."
                );
            }

            try
            {
                var resultado =
                    await EnsureDepreciation(
                        activoId,
                        fechaHasta.Value,
                        token
                    );

                if (
                    resultado.Detalle.Count ==
                    0
                )
                {
                    return Ok(
                        new
                        {
                            ActivoId =
                                activo.Id,
                            NombreActivo =
                                activo.Nombre,
                            activo.CostoAdquisicion,
                            activo.FechaCompra,
                            activo.Categoria,
                            activo.VidaUtilMeses,
                            activo.ValorResidualPorcentaje,
                            FechaHasta =
                                fechaHasta.Value.Date,
                            PeriodosSolicitados = 0,
                            PeriodosGenerados = 0,
                            Detalle =
                                resultado.Detalle
                        }
                    );
                }

                return Ok(
                    new
                    {
                        ActivoId =
                            activo.Id,
                        NombreActivo =
                            activo.Nombre,
                        activo.CostoAdquisicion,
                        activo.FechaCompra,
                        activo.Categoria,
                        activo.VidaUtilMeses,
                        activo.ValorResidualPorcentaje,
                        FechaHasta =
                            fechaHasta.Value.Date,
                        PeriodosSolicitados =
                            resultado.PeriodosSolicitados,
                        PeriodosGenerados =
                            resultado.Detalle.Count,
                        Detalle =
                            resultado.Detalle
                    }
                );
            }
            catch (ArgumentException ex)
            {
                return BadRequest(
                    ex.Message
                );
            }
        }

        var detalle =
            await _context.Depreciaciones
                .Where(
                    d =>
                        d.ActivoId ==
                        activoId
                )
                .OrderBy(
                    d =>
                        d.NumeroPeriodo
                )
                .AsNoTracking()
                .ToListAsync();

        if (detalle.Count == 0)
        {
            return NotFound(
                "El activo todavía no tiene una depreciación generada."
            );
        }

        return Ok(
            new
            {
                ActivoId =
                    activo.Id,
                NombreActivo =
                    activo.Nombre,
                activo.CostoAdquisicion,
                activo.FechaCompra,
                activo.Categoria,
                activo.VidaUtilMeses,
                activo.ValorResidualPorcentaje,
                PeriodosGenerados =
                    detalle.Count,
                Detalle =
                    detalle
            }
        );
    }

    [HttpGet("activo/{activoId}/pdf")]
    public async Task<IActionResult> ExportarPdf(
        int activoId,
        [FromQuery] DateTime fechaHasta)
    {
        if (activoId <= 0)
        {
            return BadRequest(
                "El ID del activo debe ser mayor que cero."
            );
        }

        if (!TryGetToken(out var token))
        {
            return Unauthorized(
                "No se proporcionó un token JWT válido."
            );
        }

        if (fechaHasta == default)
        {
            return BadRequest(
                "La fecha hasta es obligatoria."
            );
        }

        try
        {
            var resultado =
                await EnsureDepreciation(
                    activoId,
                    fechaHasta,
                    token
                );

            if (resultado.Activo == null)
            {
                return NotFound(
                    "Activo no encontrado o no pertenece al usuario."
                );
            }

            if (resultado.Detalle.Count == 0)
            {
                return BadRequest(
                    "No existen meses completos para generar el reporte."
                );
            }

            var document =
                new DepreciationPdfDocument(
                    resultado.Activo,
                    resultado.Detalle,
                    fechaHasta.Date
                );

            var pdf =
                document.GeneratePdf();

            var nombreArchivo =
                $"Depreciacion_{resultado.Activo.Nombre.Replace(" ", "_")}_{fechaHasta:yyyyMMdd}.pdf";

            return File(
                pdf,
                "application/pdf",
                nombreArchivo
            );
        }
        catch (ArgumentException ex)
        {
            return BadRequest(
                ex.Message
            );
        }
    }
}