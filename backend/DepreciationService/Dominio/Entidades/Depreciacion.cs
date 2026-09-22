namespace DepreciationService.Dominio.Entidades;

public class Depreciacion
{
    public int Id { get; set; }
    public int ActivoId { get; set; }
    public int NumeroPeriodo { get; set; }
    public DateTime Fecha { get; set; }
    public decimal VD { get; set; }
    public decimal UDA { get; set; }
    public decimal VR { get; set; }
}