CREATE DATABASE SistemaDepreciacion;
GO

USE SistemaDepreciacion;
GO

CREATE TABLE Usuarios (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Nombre NVARCHAR(100) NOT NULL,
    Email NVARCHAR(150) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    Rol NVARCHAR(50) NOT NULL DEFAULT 'Usuario',
    FechaCreacion DATETIME2 NOT NULL DEFAULT GETDATE()
);
GO

CREATE TABLE Categorias (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Nombre NVARCHAR(100) NOT NULL,
    VidaUtilMeses INT NOT NULL,
    ValorResidualPorcentaje DECIMAL(5,2) NOT NULL DEFAULT 10.00
);
GO

INSERT INTO Categorias (
    Nombre,
    VidaUtilMeses,
    ValorResidualPorcentaje
)
VALUES
(
    'Equipos Tecnológicos',
    36,
    10.00
),
(
    'Vehículos',
    60,
    10.00
),
(
    'Edificios',
    240,
    10.00
);
GO

CREATE TABLE Activos (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UsuarioId INT NOT NULL,
    CategoriaId INT NOT NULL,
    Nombre NVARCHAR(200) NOT NULL,
    CostoAdquisicion DECIMAL(18,2) NOT NULL,
    FechaCompra DATE NOT NULL,
    FechaCreacion DATETIME2 NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_Activos_Usuarios
        FOREIGN KEY (UsuarioId)
        REFERENCES Usuarios(Id),

    CONSTRAINT FK_Activos_Categorias
        FOREIGN KEY (CategoriaId)
        REFERENCES Categorias(Id)
);
GO

CREATE TABLE Depreciaciones (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ActivoId INT NOT NULL,
    NumeroPeriodo INT NOT NULL,
    Fecha DATE NOT NULL,
    VD DECIMAL(18,2) NOT NULL,
    UDA DECIMAL(18,2) NOT NULL,
    VR DECIMAL(18,2) NOT NULL,

    CONSTRAINT FK_Depreciaciones_Activos
        FOREIGN KEY (ActivoId)
        REFERENCES Activos(Id)
);
GO

CREATE UNIQUE INDEX IX_Depreciaciones_ActivoId_NumeroPeriodo
ON Depreciaciones (
    ActivoId,
    NumeroPeriodo
);
GO