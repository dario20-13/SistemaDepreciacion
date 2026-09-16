namespace DepreciationService.Models;

public class DepreciationRequest
{
    public string NombreActivo { get; set; } = string.Empty;

    public decimal CostoAdquisicion { get; set; }

    public DateTime FechaCompra { get; set; }

    public int VidaUtilMeses { get; set; }

    public decimal PorcentajeResidual { get; set; } = 10m;
}