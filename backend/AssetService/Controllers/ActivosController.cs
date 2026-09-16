using AssetService.Data;
using AssetService.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AssetService.Controllers;

[ApiController]
[Route("api/activos")]
public class ActivosController : ControllerBase
{
    private readonly AssetDbContext _context;

    public ActivosController(
        AssetDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var activos =
            await _context.Activos
                .Include(a => a.Categoria)
                .AsNoTracking()
                .ToListAsync();

        return Ok(activos);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var activo =
            await _context.Activos
                .Include(a => a.Categoria)
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == id);

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
        [FromBody] Activo activo)
    {
        if (string.IsNullOrWhiteSpace(activo.Nombre))
        {
            return BadRequest(
                "El nombre del activo es obligatorio."
            );
        }

        if (activo.CostoAdquisicion <= 0)
        {
            return BadRequest(
                "El costo debe ser mayor que cero."
            );
        }

        var categoria =
            await _context.Categorias
                .FindAsync(activo.CategoriaId);

        if (categoria == null)
        {
            return BadRequest(
                "La categoría no existe."
            );
        }

        activo.FechaCreacion = DateTime.Now;

        _context.Activos.Add(activo);

        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetById),
            new { id = activo.Id },
            activo
        );
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(
        int id,
        [FromBody] Activo activo)
    {
        var existente =
            await _context.Activos.FindAsync(id);

        if (existente == null)
        {
            return NotFound(
                "Activo no encontrado."
            );
        }

        var categoria =
            await _context.Categorias
                .FindAsync(activo.CategoriaId);

        if (categoria == null)
        {
            return BadRequest(
                "La categoría no existe."
            );
        }

        existente.Nombre =
            activo.Nombre;

        existente.CategoriaId =
            activo.CategoriaId;

        existente.CostoAdquisicion =
            activo.CostoAdquisicion;

        existente.FechaCompra =
            activo.FechaCompra;

        await _context.SaveChangesAsync();

        return Ok(existente);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var activo =
            await _context.Activos.FindAsync(id);

        if (activo == null)
        {
            return NotFound(
                "Activo no encontrado."
            );
        }

        _context.Activos.Remove(activo);

        await _context.SaveChangesAsync();

        return NoContent();
    }
}