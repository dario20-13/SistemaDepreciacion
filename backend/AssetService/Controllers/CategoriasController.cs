using AssetService.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AssetService.Controllers;

[ApiController]
[Route("api/categorias")]
public class CategoriasController : ControllerBase
{
    private readonly AssetDbContext _context;

    public CategoriasController(
        AssetDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetCategorias()
    {
        var categorias =
            await _context.Categorias.ToListAsync();

        return Ok(categorias);
    }
}