using AskYourNotes.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Pgvector.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();

// Register the database session (DbContext) and point it at Postgres + pgvector.
// UseVector() teaches Npgsql how to read/write the "vector" column type.
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("Postgres"),
        npgsql => npgsql.UseVector()));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// A simple health check so we can confirm the API is alive.
app.MapGet("/", () => "Ask Your Notes API is running.");

app.Run();
