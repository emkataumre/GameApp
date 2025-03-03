namespace GameApi.Models;

public class Platform
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Abbreviation { get; set; } = string.Empty;

    public List<Game> Games { get; set; } = new();
}