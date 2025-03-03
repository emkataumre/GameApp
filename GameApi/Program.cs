using Microsoft.EntityFrameworkCore;
using GameApi.Data.Context;
using dotenv.net;
using Pomelo.EntityFrameworkCore.MySql.Infrastructure;

// Load .env file
DotEnv.Load();

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

// Build connection string from environment variables
var connectionString = $"server={Environment.GetEnvironmentVariable("DB_HOST")};" +
                      $"port={Environment.GetEnvironmentVariable("DB_PORT")};" +
                      $"database={Environment.GetEnvironmentVariable("DB_NAME")};" +
                      $"user={Environment.GetEnvironmentVariable("DB_USER")};" +
                      $"password={Environment.GetEnvironmentVariable("DB_PASSWORD")}";

// Add DbContext
builder.Services.AddDbContext<GameAppContext>(options =>
    options.UseMySql(
        connectionString,
        ServerVersion.AutoDetect(connectionString)
    ));

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
