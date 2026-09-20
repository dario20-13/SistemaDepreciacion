namespace AssetService.Models;

public class UpdateActivoRequest
{
    public int CategoriaId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public decimal CostoAdquisicion { get; set; }
    public DateTime FechaCompra { get; set; }
}