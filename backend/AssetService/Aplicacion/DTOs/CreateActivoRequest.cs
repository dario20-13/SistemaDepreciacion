namespace AssetService.Aplicacion.DTOs;

public class CreateActivoRequest
{
    public int CategoriaId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public decimal CostoAdquisicion { get; set; }
    public DateTime FechaCompra { get; set; }
}