using Microsoft.EntityFrameworkCore;
using AssetService.Models;

namespace AssetService.Data;

public class AssetDbContext : DbContext
{
    public AssetDbContext(
        DbContextOptions<AssetDbContext> options)
        : base(options)
    {
    }

    public DbSet<Activo> Activos => Set<Activo>();

    public DbSet<Categoria> Categorias => Set<Categoria>();

    protected override void OnModelCreating(
        ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Activo>()
            .Property(a => a.CostoAdquisicion)
            .HasColumnType("decimal(18,2)");

        modelBuilder.Entity<Categoria>()
            .Property(c => c.ValorResidualPorcentaje)
            .HasColumnType("decimal(5,2)");
    }
}