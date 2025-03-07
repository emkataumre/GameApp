using System.Security.Claims;
using GameApi.Models;

namespace GameApi.Services;

public interface ITokenService
{
    string CreateToken(User user);
    // string CreateRefreshToken();
    // ClaimsPrincipal GetPrincipalFromExpiredToken(string token);
}