namespace DepreciationService.Models;

public class DepreciationResult
{
    public int Periodo { get; set; }
    public DateTime Fecha { get; set; }
    public decimal VD { get; set; }
    public decimal UDA { get; set; }
    public decimal VR { get; set; }
}