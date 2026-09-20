using DepreciationService.Models;
using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace DepreciationService.Services;

public class AssetServiceClient
{
    private readonly HttpClient _httpClient;

    public AssetServiceClient(
        HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<ActivoResponse?> GetActivo(
        int activoId,
        string token)
    {
        using var request =
            new HttpRequestMessage(
                HttpMethod.Get,
                $"api/activos/{activoId}"
            );

        request.Headers.Authorization =
            new AuthenticationHeaderValue(
                "Bearer",
                token
            );

        using var response =
            await _httpClient.SendAsync(request);

        if (!response.IsSuccessStatusCode)
        {
            return null;
        }

        return await response.Content
            .ReadFromJsonAsync<ActivoResponse>();
    }
}