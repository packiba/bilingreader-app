package com.example.bilingreader.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun ChapterHeader(
    titleSrc: String,
    titleTgt: String,
    isDarkTheme: Boolean,
    fontSizeSp: Int
) {
    val bgColor = if (isDarkTheme) Color(0xFF2D333B) else Color(0xFFEBEDF0)
    val textColor = if (isDarkTheme) Color(0xFFADBAC7) else Color(0xFF24292F)
    val headerFontSize = (fontSizeSp + 2).sp

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(bgColor)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(IntrinsicSize.Min)
                .padding(start = 14.dp, end = 4.dp, top = 12.dp, bottom = 12.dp)
        ) {
            // Left column
            Text(
                text = titleSrc,
                color = textColor,
                fontSize = headerFontSize,
                fontWeight = FontWeight.Bold,
                modifier = Modifier
                    .weight(1f)
                    .padding(end = 6.dp)
            )

            // Divider
            Box(
                modifier = Modifier
                    .width(0.5.dp)
                    .fillMaxHeight()
                    .background(if (isDarkTheme) Color(0x33FFFFFF) else Color(0x33000000))
            )

            // Right column
            Text(
                text = titleTgt,
                color = textColor,
                fontSize = headerFontSize,
                fontWeight = FontWeight.Bold,
                modifier = Modifier
                    .weight(1f)
                    .padding(start = 6.dp)
            )
        }
    }
}
