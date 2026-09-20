using DepreciationService.Models;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace DepreciationService.Documents;

public class DepreciationPdfDocument : IDocument
{
    private readonly ActivoResponse _activo;
    private readonly List<Depreciacion> _detalle;
    private readonly DateTime _fechaHasta;

    public DepreciationPdfDocument(
        ActivoResponse activo,
        List<Depreciacion> detalle,
        DateTime fechaHasta)
    {
        _activo = activo;
        _detalle = detalle;
        _fechaHasta = fechaHasta;
    }

    public DocumentMetadata GetMetadata()
    {
        return DocumentMetadata.Default;
    }

    public DocumentSettings GetSettings()
    {
        return DocumentSettings.Default;
    }

    public void Compose(
        IDocumentContainer container)
    {
        container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(30);

            page.Header()
                .Column(column =>
                {
                    column.Item()
                        .Text(
                            "SISTEMA DE DEPRECIACIÓN"
                        )
                        .Bold()
                        .FontSize(20);

                    column.Item()
                        .Text(
                            "Detalle de depreciación del activo"
                        )
                        .FontSize(11);
                });

            page.Content()
                .PaddingVertical(15)
                .Column(column =>
                {
                    column.Spacing(8);

                    column.Item()
                        .Text(
                            $"Activo: {_activo.Nombre}"
                        )
                        .Bold()
                        .FontSize(12);

                    column.Item()
                        .Text(
                            $"Categoría: {_activo.Categoria}"
                        );

                    column.Item()
                        .Text(
                            $"Costo de adquisición: ${_activo.CostoAdquisicion:N2}"
                        );

                    column.Item()
                        .Text(
                            $"Fecha de compra: {_activo.FechaCompra:dd/MM/yyyy}"
                        );

                    column.Item()
                        .Text(
                            $"Vida útil: {_activo.VidaUtilMeses} meses"
                        );

                    column.Item()
                        .Text(
                            $"Valor residual: {_activo.ValorResidualPorcentaje:N2}%"
                        );

                    var valorResidual =
                        Math.Round(
                            _activo.CostoAdquisicion *
                            _activo.ValorResidualPorcentaje /
                            100m,
                            2
                        );

                    var valorDepreciable =
                        Math.Round(
                            _activo.CostoAdquisicion -
                            valorResidual,
                            2
                        );

                    column.Item()
                        .Text(
                            $"Valor residual monetario: ${valorResidual:N2}"
                        );

                    column.Item()
                        .Text(
                            $"Valor depreciable: ${valorDepreciable:N2}"
                        );

                    column.Item()
                        .Text(
                            $"Consultar hasta: {_fechaHasta:dd/MM/yyyy}"
                        )
                        .Bold();

                    column.Item()
                        .PaddingTop(12)
                        .Table(table =>
                        {
                            table.ColumnsDefinition(
                                columns =>
                                {
                                    columns.ConstantColumn(
                                        55
                                    );

                                    columns.RelativeColumn(
                                        1.5f
                                    );

                                    columns.RelativeColumn(
                                        1
                                    );

                                    columns.RelativeColumn(
                                        1
                                    );

                                    columns.RelativeColumn(
                                        1
                                    );
                                }
                            );

                            table.Header(
                                header =>
                                {
                                    header.Cell()
                                        .Element(HeaderCell)
                                        .Text("Período");

                                    header.Cell()
                                        .Element(HeaderCell)
                                        .Text("Fecha");

                                    header.Cell()
                                        .Element(HeaderCell)
                                        .Text("VD");

                                    header.Cell()
                                        .Element(HeaderCell)
                                        .Text("UDA");

                                    header.Cell()
                                        .Element(HeaderCell)
                                        .Text("VR");
                                }
                            );

                            foreach (
                                var item
                                in _detalle
                            )
                            {
                                table.Cell()
                                    .Element(BodyCell)
                                    .Text(
                                        item.NumeroPeriodo
                                            .ToString()
                                    );

                                table.Cell()
                                    .Element(BodyCell)
                                    .Text(
                                        item.Fecha
                                            .ToString(
                                                "dd/MM/yyyy"
                                            )
                                    );

                                table.Cell()
                                    .Element(BodyCell)
                                    .Text(
                                        $"${item.VD:N2}"
                                    );

                                table.Cell()
                                    .Element(BodyCell)
                                    .Text(
                                        $"${item.UDA:N2}"
                                    );

                                table.Cell()
                                    .Element(BodyCell)
                                    .Text(
                                        $"${item.VR:N2}"
                                    );
                            }
                        });
                });

            page.Footer()
                .AlignCenter()
                .Text(text =>
                {
                    text.Span("Página ");
                    text.CurrentPageNumber();
                });
        });
    }

    private static IContainer HeaderCell(
        IContainer container)
    {
        return container
            .Border(1)
            .Padding(5)
            .Background(
                Colors.Grey.Lighten2
            );
    }

    private static IContainer BodyCell(
        IContainer container)
    {
        return container
            .Border(1)
            .Padding(4);
    }
}