using DepreciationService.Models;
using DepreciationService.Services;
using Microsoft.AspNetCore.Mvc;

namespace DepreciationService.Controllers;

[ApiController]
[Route("api/depreciacion")]
public class DepreciationController : ControllerBase
{
    private readonly DepreciationCalculator _calculator;

    public DepreciationController(
        DepreciationCalculator calculator)
    {
        _calculator = calculator;
    }

    [HttpPost("calcular")]
    public IActionResult Calcular(
        [FromBody] DepreciationRequest request)
    {
        if (request.CostoAdquisicion <= 0)
        {
            return BadRequest(
                "El costo debe ser mayor que cero."
            );
        }

        if (request.VidaUtilMeses <= 0)
        {
            return BadRequest(
                "La vida útil debe ser mayor que cero."
            );
        }

        if (request.PorcentajeResidual != 10)
        {
            return BadRequest(
                "El valor residual debe ser exactamente 10%."
            );
        }

        var detalle =
            _calculator.Calculate(
                request.CostoAdquisicion,
                request.FechaCompra,
                request.VidaUtilMeses,
                request.PorcentajeResidual
            );

        decimal valorResidual =
            Math.Round(
                request.CostoAdquisicion * 0.10m,
                2
            );

        decimal valorDepreciable =
            request.CostoAdquisicion -
            valorResidual;

        decimal depreciacionMensual =
            Math.Round(
                valorDepreciable /
                request.VidaUtilMeses,
                2
            );

        return Ok(new
        {
            request.NombreActivo,

            request.CostoAdquisicion,

            ValorResidual = valorResidual,

            ValorDepreciable = valorDepreciable,

            request.VidaUtilMeses,

            DepreciacionMensual =
                depreciacionMensual,

            Detalle = detalle
        });
    }
}