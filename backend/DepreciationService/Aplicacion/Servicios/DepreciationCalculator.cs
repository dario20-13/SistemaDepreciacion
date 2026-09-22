using DepreciationService.Aplicacion.DTOs;

namespace DepreciationService.Aplicacion.Servicios;

public class DepreciationCalculator
{
    public int CalculateCompleteMonths(
        DateTime fechaCompra,
        DateTime fechaHasta)
    {
        fechaCompra = fechaCompra.Date;
        fechaHasta = fechaHasta.Date;

        if (fechaHasta < fechaCompra)
        {
            throw new ArgumentException(
                "La fecha hasta no puede ser anterior a la fecha de compra."
            );
        }

        var meses =
            (
                fechaHasta.Year -
                fechaCompra.Year
            ) * 12
            +
            (
                fechaHasta.Month -
                fechaCompra.Month
            );

        if (
            fechaCompra
                .AddMonths(meses)
                .Date > fechaHasta
        )
        {
            meses--;
        }

        return Math.Max(meses, 0);
    }

    public List<DepreciationResult> Calculate(
        decimal costo,
        DateTime fechaCompra,
        int vidaUtilMeses,
        decimal porcentajeResidual,
        int periodosSolicitados)
    {
        if (costo <= 0)
        {
            throw new ArgumentException(
                "El costo debe ser mayor que cero."
            );
        }

        if (vidaUtilMeses <= 0)
        {
            throw new ArgumentException(
                "La vida útil debe ser mayor que cero."
            );
        }

        if (porcentajeResidual != 10)
        {
            throw new ArgumentException(
                "El valor residual debe ser exactamente 10%."
            );
        }

        if (periodosSolicitados < 0)
        {
            throw new ArgumentException(
                "El número de períodos no puede ser negativo."
            );
        }

        var valorResidual =
            Math.Round(
                costo *
                porcentajeResidual /
                100m,
                2
            );

        var valorDepreciable =
            Math.Round(
                costo - valorResidual,
                2
            );

        var depreciacionMensual =
            Math.Round(
                valorDepreciable /
                vidaUtilMeses,
                2
            );

        var resultados =
            new List<DepreciationResult>();

        decimal acumulada = 0m;

        for (
            int periodo = 1;
            periodo <= periodosSolicitados;
            periodo++
        )
        {
            decimal depreciacionPeriodo;

            if (periodo > vidaUtilMeses)
            {
                depreciacionPeriodo = 0m;
            }
            else if (periodo == vidaUtilMeses)
            {
                depreciacionPeriodo =
                    valorDepreciable -
                    acumulada;
            }
            else
            {
                depreciacionPeriodo =
                    depreciacionMensual;
            }

            depreciacionPeriodo =
                Math.Round(
                    depreciacionPeriodo,
                    2
                );

            if (depreciacionPeriodo < 0)
            {
                depreciacionPeriodo = 0m;
            }

            acumulada +=
                depreciacionPeriodo;

            acumulada =
                Math.Round(
                    acumulada,
                    2
                );

            if (acumulada > valorDepreciable)
            {
                acumulada =
                    valorDepreciable;
            }

            var valorLibros =
                Math.Round(
                    costo - acumulada,
                    2
                );

            if (valorLibros < valorResidual)
            {
                valorLibros =
                    valorResidual;
            }

            resultados.Add(
                new DepreciationResult
                {
                    Periodo = periodo,
                    Fecha =
                        fechaCompra
                            .Date
                            .AddMonths(periodo),
                    VD =
                        depreciacionPeriodo,
                    UDA =
                        acumulada,
                    VR =
                        valorLibros
                }
            );
        }

        return resultados;
    }
}