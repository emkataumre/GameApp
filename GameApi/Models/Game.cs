namespace GameApi.Models;

public class Game
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string CoverUlr { get; set; } = string.Empty;
    public DateTime FirstReleaseDate { get; set; }
    public double TotalRating { get; set; }
    public int TotalRatingCount { get; set; }

    public List<Platform> Platforms { get; set; } = new();
    public List<GameMode> GameModes { get; set; } = new();
    public List<Genre> Genres { get; set; } = new();
    public List<Company> Companies { get; set; } = new();
    public List<Review> Reviews { get; set; } = new();
    public List<GameStatus> GameStatuses { get; set; } = new();
}