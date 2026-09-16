namespace AssetService.Models;

public class Categoria
{
    public int Id { get; set; }

    public string Nombre { get; set; } = string.Empty;

    public int VidaUtilMeses { get; set; }

    public decimal ValorResidualPorcentaje { get; set; }

    public ICollection<Activo> Activos { get; set; }
        = new List<Activo>();
}