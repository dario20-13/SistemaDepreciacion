using AssetService.Dominio.Entidades;
using Microsoft.EntityFrameworkCore;

namespace AssetService.Estructura.Persistencia;

public class AssetDbContext : DbContext
{
    public AssetDbContext(
        DbContextOptions<AssetDbContext> options)
        : base(options)
    {
    }

    public DbSet<Activo> Activos => Set<Activo>();
    public DbSet<Categoria> Categorias => Set<Categoria>();
    public DbSet<Depreciacion> Depreciaciones =>
        Set<Depreciacion>();

    protected override void OnModelCreating(
        ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Activo>()
            .ToTable("Activos");

        modelBuilder.Entity<Categoria>()
            .ToTable("Categorias");

        modelBuilder.Entity<Depreciacion>()
            .ToTable("Depreciaciones");

        modelBuilder.Entity<Activo>()
            .HasKey(a => a.Id);

        modelBuilder.Entity<Categoria>()
            .HasKey(c => c.Id);

        modelBuilder.Entity<Depreciacion>()
            .HasKey(d => d.Id);

        modelBuilder.Entity<Activo>()
            .Property(a => a.CostoAdquisicion)
            .HasColumnType("decimal(18,2)");

        modelBuilder.Entity<Categoria>()
            .Property(c => c.ValorResidualPorcentaje)
            .HasColumnType("decimal(5,2)");

        modelBuilder.Entity<Depreciacion>()
            .Property(d => d.VD)
            .HasColumnType("decimal(18,2)");

        modelBuilder.Entity<Depreciacion>()
            .Property(d => d.UDA)
            .HasColumnType("decimal(18,2)");

        modelBuilder.Entity<Depreciacion>()
            .Property(d => d.VR)
            .HasColumnType("decimal(18,2)");

        modelBuilder.Entity<Activo>()
            .HasOne(a => a.Categoria)
            .WithMany(c => c.Activos)
            .HasForeignKey(a => a.CategoriaId)
            .OnDelete(DeleteBehavior.Restrict);

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