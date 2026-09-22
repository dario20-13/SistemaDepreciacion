using AssetService.Estructura.Persistencia;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AssetService.Presentacion.Controllers;

[ApiController]
[Route("api/categorias")]
[Authorize]
public class CategoriasController : ControllerBase
{
    private readonly AssetDbContext _context;

    public CategoriasController(
        AssetDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var categorias =
            await _context.Categorias
                .AsNoTracking()
                .Select(c => new
                {
                    c.Id,
                    c.Nombre,
                    c.VidaUtilMeses,
                    c.ValorResidualPorcentaje
                })
                .ToListAsync();

        return Ok(categorias);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(
        int id)
    {
        var categoria =
            await _context.Categorias
                .AsNoTracking()
                .Where(c => c.Id == id)
                .Select(c => new
                {
                    c.Id,
                    c.Nombre,
                    c.VidaUtilMeses,
                    c.ValorResidualPorcentaje
                })
                .FirstOrDefaultAsync();

        if (categoria == null)
        {
            return NotFound(
                "Categoría no encontrada."
            );
        }

        return Ok(categoria);
    }
}