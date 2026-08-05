package com.example.bilingreader.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    background = DarkBackground,
    surface = DarkZebra2,
    onBackground = DarkTextActive,
    onSurface = DarkTextActive,
    outline = DarkDivider,
    surfaceVariant = DarkZebra2
)

private val LightColorScheme = lightColorScheme(
    background = LightBackground,
    surface = LightZebra2,
    onBackground = LightTextActive,
    onSurface = LightTextActive,
    outline = LightDivider,
    surfaceVariant = LightZebra2
)

@Composable
fun BilingReaderTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme,
        typography = Typography,
        content = content
    )
}