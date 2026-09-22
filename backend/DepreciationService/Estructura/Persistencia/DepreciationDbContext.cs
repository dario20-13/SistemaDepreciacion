using DepreciationService.Dominio.Entidades;
using Microsoft.EntityFrameworkCore;

namespace DepreciationService.Estructura.Persistencia;

public class DepreciationDbContext : DbContext
{
    public DepreciationDbContext(
        DbContextOptions<DepreciationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Depreciacion> Depreciaciones =>
        Set<Depreciacion>();

    protected override void OnModelCreating(
        ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Depreciacion>()
            .ToTable("Depreciaciones");

        modelBuilder.Entity<Depreciacion>()
            .HasKey(d => d.Id);

        modelBuilder.Entity<Depreciacion>()
            .Property(d => d.VD)
            .HasColumnType("decimal(18,2)");

        modelBuilder.Entity<Depreciacion>()
            .Property(d => d.UDA)
            .HasColumnType("decimal(18,2)");

        modelBuilder.Entity<Depreciacion>()
            .Property(d => d.VR)
            .HasColumnType("decimal(18,2)");

        modelBuilder.Entity<Depreciacion>()
            .HasIndex(
                d =>
                    new
                    {
                        d.ActivoId,
                        d.NumeroPeriodo
                    }
            )
            .IsUnique();
    }
}