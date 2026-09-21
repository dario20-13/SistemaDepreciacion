using DepreciationService.Data;
using DepreciationService.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using QuestPDF.Infrastructure;
using System.Text;

QuestPDF.Settings.License =
    LicenseType.Community;

var builder =
    WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

// CORS para permitir la comunicación con React
builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactPolicy", policy =>
    {
        policy
            .WithOrigins("http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddDbContext<
    DepreciationDbContext
>(
    options =>
        options.UseSqlServer(
            builder.Configuration
                .GetConnectionString(
                    "DefaultConnection"
                )
        )
);

builder.Services.AddScoped<
    DepreciationCalculator
>();

builder.Services.AddHttpClient<
    AssetServiceClient
>(
    client =>
    {
        client.BaseAddress =
            new Uri(
                "http://localhost:5005/"
            );
    }
);

var jwtKey =
    builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException(
        "No se encontró la clave JWT."
    );

var jwtIssuer =
    builder.Configuration["Jwt:Issuer"]
    ?? throw new InvalidOperationException(
        "No se encontró el issuer JWT."
    );

var jwtAudience =
    builder.Configuration["Jwt:Audience"]
    ?? throw new InvalidOperationException(
        "No se encontró el audience JWT."
    );

builder.Services
    .AddAuthentication(
        JwtBearerDefaults.AuthenticationScheme
    )
    .AddJwtBearer(
        options =>
        {
            options.TokenValidationParameters =
                new TokenValidationParameters
                {
                    ValidateIssuer =
                        true,

                    ValidateAudience =
                        true,

                    ValidateLifetime =
                        true,

                    ValidateIssuerSigningKey =
                        true,

                    ValidIssuer =
                        jwtIssuer,

                    ValidAudience =
                        jwtAudience,

                    IssuerSigningKey =
                        new SymmetricSecurityKey(
                            Encoding.UTF8.GetBytes(
                                jwtKey
                            )
                        ),

                    ClockSkew =
                        TimeSpan.Zero
                };
        }
    );

builder.Services.AddAuthorization();

builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(
    options =>
    {
        options.AddSecurityDefinition(
            "Bearer",
            new OpenApiSecurityScheme
            {
                Name =
                    "Authorization",

                Type =
                    SecuritySchemeType.Http,

                Scheme =
                    "bearer",

                BearerFormat =
                    "JWT",

                Description =
                    "Ingrese el token JWT sin comillas."
            }
        );

        options.AddSecurityRequirement(
            document =>
                new OpenApiSecurityRequirement
                {
                    [
                        new OpenApiSecuritySchemeReference(
                            "Bearer",
                            document
                        )
                    ] = []
                }
        );
    }
);

var app =
    builder.Build();

if (
    app.Environment.IsDevelopment()
)
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// CORS debe ejecutarse antes de Authentication y Authorization
app.UseCors("ReactPolicy");

app.UseAuthentication();

app.UseAuthorization();

app.MapControllers();

app.Run();