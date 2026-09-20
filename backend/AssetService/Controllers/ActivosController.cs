using AssetService.Data;
using AssetService.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace AssetService.Controllers;

[ApiController]
[Route("api/activos")]
[Authorize]
public class ActivosController : ControllerBase
{
    private readonly AssetDbContext _context;

    public ActivosController(
        AssetDbContext context)
    {
        _context = context;
    }

    private bool TryGetUsuarioId(
        out int usuarioId)
    {
        var claim =
            User.FindFirst(
                ClaimTypes.NameIdentifier
            )?.Value;

        return int.TryParse(
            claim,
            out usuarioId
        );
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        if (!TryGetUsuarioId(out var usuarioId))
        {
            return Unauthorized(
                "No se pudo identificar al usuario."
            );
        }

        var activos =
            await _context.Activos
                .Where(
                    a =>
                        a.UsuarioId == usuarioId
                )
                .Select(a => new ActivoResponse
                {
                    Id = a.Id,
                    UsuarioId = a.UsuarioId,
                    CategoriaId = a.CategoriaId,
                    Nombre = a.Nombre,
                    CostoAdquisicion =
                        a.CostoAdquisicion,
                    FechaCompra =
                        a.FechaCompra,
                    FechaCreacion =
                        a.FechaCreacion,
                    Categoria =
                        a.Categoria!.Nombre,
                    VidaUtilMeses =
                        a.Categoria!.VidaUtilMeses,
                    ValorResidualPorcentaje =
                        a.Categoria!
                            .ValorResidualPorcentaje
                })
                .AsNoTracking()
                .ToListAsync();

        return Ok(activos);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(
        int id)
    {
        if (!TryGetUsuarioId(out var usuarioId))
        {
            return Unauthorized(
                "No se pudo identificar al usuario."
            );
        }

        var activo =
            await _context.Activos
                .Where(
                    a =>
                        a.Id == id &&
                        a.UsuarioId == usuarioId
                )
                .Select(a => new ActivoResponse
                {
                    Id = a.Id,
                    UsuarioId = a.UsuarioId,
                    CategoriaId =
                        a.CategoriaId,
                    Nombre = a.Nombre,
                    CostoAdquisicion =
                        a.CostoAdquisicion,
                    FechaCompra =
                        a.FechaCompra,
                    FechaCreacion =
                        a.FechaCreacion,
                    Categoria =
                        a.Categoria!.Nombre,
                    VidaUtilMeses =
                        a.Categoria!.VidaUtilMeses,
                    ValorResidualPorcentaje =
                        a.Categoria!
                            .ValorResidualPorcentaje
                })
                .AsNoTracking()
                .FirstOrDefaultAsync();

        if (activo == null)
        {
            return NotFound(
                "Activo no encontrado."
            );
        }

        return Ok(activo);
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateActivoRequest request)
    {
        if (!TryGetUsuarioId(out var usuarioId))
        {
            return Unauthorized(
                "No se pudo identificar al usuario."
            );
        }

        if (string.IsNullOrWhiteSpace(
            request.Nombre))
        {
            return BadRequest(
                "El nombre del activo es obligatorio."
            );
        }

        if (request.CostoAdquisicion <= 0)
        {
            return BadRequest(
                "El costo debe ser mayor que cero."
            );
        }

        if (request.FechaCompra == default)
        {
            return BadRequest(
                "La fecha de compra es obligatoria."
            );
        }

        var categoria =
            await _context.Categorias
                .FirstOrDefaultAsync(
                    c =>
                        c.Id ==
                        request.CategoriaId
                );

        if (categoria == null)
        {
            return BadRequest(
                "La categoría no existe."
            );
        }

        var activo = new Activo
        {
            UsuarioId = usuarioId,
            CategoriaId =
                request.CategoriaId,
            Nombre =
                request.Nombre.Trim(),
            CostoAdquisicion =
                Math.Round(
                    request.CostoAdquisicion,
                    2
                ),
            FechaCompra =
                request.FechaCompra.Date,
            FechaCreacion =
                DateTime.Now
        };

        _context.Activos.Add(activo);

        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetById),
            new { id = activo.Id },
            new
            {
                activo.Id,
                activo.UsuarioId,
                activo.CategoriaId,
                activo.Nombre,
                activo.CostoAdquisicion,
                activo.FechaCompra,
                activo.FechaCreacion
            }
        );
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(
        int id,
        [FromBody] UpdateActivoRequest request)
    {
        if (!TryGetUsuarioId(out var usuarioId))
        {
            return Unauthorized(
                "No se pudo identificar al usuario."
            );
        }

        var existente =
            await _context.Activos
                .FirstOrDefaultAsync(
                    a =>
                        a.Id == id &&
                        a.UsuarioId == usuarioId
                );

        if (existente == null)
        {
            return NotFound(
                "Activo no encontrado."
            );
        }

        var tieneDepreciacion =
            await _context.Depreciaciones
                .AnyAsync(
                    d =>
                        d.ActivoId == id
                );

        if (tieneDepreciacion)
        {
            return Conflict(
                "El activo ya tiene una depreciación generada y no puede ser modificado."
            );
        }

        if (string.IsNullOrWhiteSpace(
            request.Nombre))
        {
            return BadRequest(
                "El nombre del activo es obligatorio."
            );
        }

        if (request.CostoAdquisicion <= 0)
        {
            return BadRequest(
                "El costo debe ser mayor que cero."
            );
        }

        if (request.FechaCompra == default)
        {
            return BadRequest(
                "La fecha de compra es obligatoria."
            );
        }

        var categoria =
            await _context.Categorias
                .FirstOrDefaultAsync(
                    c =>
                        c.Id ==
                        request.CategoriaId
                );

        if (categoria == null)
        {
            return BadRequest(
                "La categoría no existe."
            );
        }

        existente.Nombre =
            request.Nombre.Trim();

        existente.CategoriaId =
            request.CategoriaId;

        existente.CostoAdquisicion =
            Math.Round(
                request.CostoAdquisicion,
                2
            );

        existente.FechaCompra =
            request.FechaCompra.Date;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            mensaje =
                "Activo actualizado correctamente.",
            existente.Id,
            existente.UsuarioId,
            existente.CategoriaId,
            existente.Nombre,
            existente.CostoAdquisicion,
            existente.FechaCompra,
            existente.FechaCreacion
        });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(
        int id)
    {
        if (!TryGetUsuarioId(out var usuarioId))
        {
            return Unauthorized(
                "No se pudo identificar al usuario."
            );
        }

        var activo =
            await _context.Activos
                .FirstOrDefaultAsync(
                    a =>
                        a.Id == id &&
                        a.UsuarioId == usuarioId
                );

        if (activo == null)
        {
            return NotFound(
                "Activo no encontrado."
            );
        }

        var tieneDepreciacion =
            await _context.Depreciaciones
                .AnyAsync(
                    d =>
                        d.ActivoId == id
                );

        if (tieneDepreciacion)
        {
            return Conflict(
                "El activo ya tiene una depreciación generada y no puede ser eliminado."
            );
        }

        _context.Activos.Remove(activo);

        await _context.SaveChangesAsync();

        return NoContent();
    }
}