

namespace AssetService.Models;

public class Activo
{
    public int Id { get; set; }

    public int UsuarioId { get; set; }

    public int CategoriaId { get; set; }

    public string Nombre { get; set; } = string.Empty;

    public decimal CostoAdquisicion { get; set; }

    public DateTime FechaCompra { get; set; }

    public DateTime FechaCreacion { get; set; }

    public Categoria? Categoria { get; set; }
}