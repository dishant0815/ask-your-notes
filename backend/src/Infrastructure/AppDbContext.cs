using AskYourNotes.Domain;
using Microsoft.EntityFrameworkCore;

namespace AskYourNotes.Infrastructure;

// EF Core's view of our database: two tables (Documents, Chunks) and how they map.
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Document> Documents => Set<Document>();
    public DbSet<Chunk> Chunks => Set<Chunk>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Tell Postgres to enable the pgvector extension when the schema is created.
        modelBuilder.HasPostgresExtension("vector");

        modelBuilder.Entity<Document>(entity =>
        {
            entity.HasKey(d => d.Id);
            entity.Property(d => d.FileName).IsRequired();

            // One Document -> many Chunks. Deleting a document deletes its chunks too.
            entity.HasMany(d => d.Chunks)
                  .WithOne(c => c.Document!)
                  .HasForeignKey(c => c.DocumentId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Chunk>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Text).IsRequired();

            // The embedding is a 3072-dimension vector column (matches gemini-embedding-001).
            entity.Property(c => c.Embedding).HasColumnType("vector(3072)");
        });
    }
}
