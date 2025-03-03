using Microsoft.EntityFrameworkCore;
using GameApi.Models;

namespace GameApi.Data.Context;

public class GameAppContext : DbContext
{
    public GameAppContext(DbContextOptions<GameAppContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users { get; set; } = null!;
    public DbSet<Game> Games { get; set; } = null!;
    public DbSet<Review> Reviews { get; set; } = null!;
    public DbSet<GameStatus> GameStatuses { get; set; } = null!;
    public DbSet<Platform> Platforms { get; set; } = null!;
    public DbSet<GameMode> GameModes { get; set; } = null!;
    public DbSet<Genre> Genres { get; set; } = null!;
    public DbSet<Company> Companies { get; set; } = null!;
}