using DepreciationService.Models;

namespace DepreciationService.Services;

public class DepreciationCalculator
{
    public List<DepreciationResult> Calculate(
        decimal costo,
        DateTime fechaCompra,
        int vidaUtilMeses,
        decimal porcentajeResidual)
    {
        decimal valorResidual =
            Math.Round(
                costo * porcentajeResidual / 100m,
                2
            );

        decimal valorDepreciable =
            costo - valorResidual;

        decimal depreciacionMensual =
            Math.Round(
                valorDepreciable / vidaUtilMeses,
                2
            );

        var resultados =
            new List<DepreciationResult>();

        decimal acumulada = 0m;

        for (
            int mes = 1;
            mes <= vidaUtilMeses;
            mes++
        )
        {
            decimal depreciacionPeriodo =
                depreciacionMensual;

            if (mes == vidaUtilMeses)
            {
                depreciacionPeriodo =
                    valorDepreciable - acumulada;
            }

            acumulada += depreciacionPeriodo;

            if (acumulada > valorDepreciable)
            {
                acumulada = valorDepreciable;
            }

            decimal valorLibros =
                costo - acumulada;

            if (valorLibros < valorResidual)
            {
                valorLibros = valorResidual;
            }

            resultados.Add(
                new DepreciationResult
                {
                    Periodo = mes,

                    Fecha =
                        fechaCompra.AddMonths(mes),

                    VD =
                        Math.Round(
                            depreciacionPeriodo,
                            2
                        ),

                    UDA =
                        Math.Round(
                            acumulada,
                            2
                        ),

                    VR =
                        Math.Round(
                            valorLibros,
                            2
                        )
                }
            );
        }

        return resultados;
    }
}