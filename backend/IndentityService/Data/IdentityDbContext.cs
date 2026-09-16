using IdentityService.Models;
using Microsoft.EntityFrameworkCore;

namespace IdentityService.Data;

public class IdentityDbContext : DbContext
{
    public IdentityDbContext(
        DbContextOptions<IdentityDbContext> options)
        : base(options)
    {
    }

    public DbSet<Usuario> Usuarios => Set<Usuario>();

    protected override void OnModelCreating(
        ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Usuario>()
            .ToTable("Usuarios");

        modelBuilder.Entity<Usuario>()
            .HasKey(u => u.Id);

        modelBuilder.Entity<Usuario>()
            .HasIndex(u => u.Email)
            .IsUnique();

        modelBuilder.Entity<Usuario>()
            .Property(u => u.Nombre)
            .HasMaxLength(100)
            .IsRequired();

        modelBuilder.Entity<Usuario>()
            .Property(u => u.Email)
            .HasMaxLength(150)
            .IsRequired();

        modelBuilder.Entity<Usuario>()
            .Property(u => u.PasswordHash)
            .HasMaxLength(255)
            .IsRequired();

        modelBuilder.Entity<Usuario>()
            .Property(u => u.Rol)
            .HasMaxLength(50)
            .IsRequired();
    }
}