using api.models.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace api.services.Data;

public class AppDbContext : IdentityDbContext<AppUser, IdentityRole<int>, int>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Ticket> Tickets { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Ticket>(entity =>
        {
            entity.ToTable("Tickets");

            entity.Property(t => t.Title).IsRequired().HasMaxLength(200);
            entity.Property(t => t.Description).IsRequired().HasMaxLength(4000);
            entity.Property(t => t.Status).IsRequired().HasMaxLength(50).HasDefaultValue("open");
            entity.Property(t => t.Priority).IsRequired().HasMaxLength(50).HasDefaultValue("medium");
            entity.Property(t => t.CreatedAt).HasDefaultValueSql("datetime('now')");
            entity.Property(t => t.IsDeleted).HasDefaultValue(false);

            entity.HasIndex(t => t.CreatedById);
            entity.HasIndex(t => t.Status);
            entity.HasIndex(t => t.AssignedToId);
            entity.HasIndex(t => t.IsDeleted);

            entity.HasOne<AppUser>()
                .WithMany()
                .HasForeignKey(t => t.CreatedById)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne<AppUser>()
                .WithMany()
                .HasForeignKey(t => t.AssignedToId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }
}
