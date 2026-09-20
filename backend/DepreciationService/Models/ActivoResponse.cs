namespace DepreciationService.Models;

public class ActivoResponse
{
    public int Id { get; set; }
    public int UsuarioId { get; set; }
    public int CategoriaId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public decimal CostoAdquisicion { get; set; }
    public DateTime FechaCompra { get; set; }
    public DateTime FechaCreacion { get; set; }
    public string Categoria { get; set; } = string.Empty;
    public int VidaUtilMeses { get; set; }
    public decimal ValorResidualPorcentaje { get; set; }
}