namespace DepreciationService.Aplicacion.DTOs;

public class DepreciationRequest
{
    public int ActivoId { get; set; }
    public DateTime FechaHasta { get; set; }
}