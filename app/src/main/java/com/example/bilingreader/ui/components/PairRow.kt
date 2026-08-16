package com.example.bilingreader.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.SwipeToDismissBox
import androidx.compose.material3.SwipeToDismissBoxValue
import androidx.compose.material3.Text
import androidx.compose.material3.rememberSwipeToDismissBoxState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.bilingreader.ui.screen.ExpandMode

@Composable
fun PairRow(
    srcText: String,
    tgtText: String,
    isRead: Boolean,
    isZebra: Boolean,
    isDarkTheme: Boolean,
    fontSizeSp: Int,
    expandMode: ExpandMode = ExpandMode.NONE,
    onSwipeLeft: () -> Unit,
    onSwipeRight: () -> Unit
) {
    val dimmedColor = if (isDarkTheme) Color(0xFF888888) else Color(0xFF999999)
    val activeColor = if (isDarkTheme) Color(0xFFD1D5DB) else Color(0xFF333333)
    val zebraBg = if (isDarkTheme)
        (if (isZebra) Color(0xFF21262D) else Color(0xFF1A1E24))
        else (if (isZebra) Color(0xFFFFFFFF) else Color(0xFFF4F6F8))
    val textColor by animateColorAsState(if (isRead) dimmedColor else activeColor, label = "textColor")
    val dividerColor = if (isDarkTheme) Color(0x33FFFFFF) else Color(0x33000000)

    val dismissState = rememberSwipeToDismissBoxState(
        confirmValueChange = {
            if (it == SwipeToDismissBoxValue.EndToStart) { onSwipeLeft(); false }
            else if (it == SwipeToDismissBoxValue.StartToEnd) { onSwipeRight(); false }
            else false
        }
    )

    SwipeToDismissBox(
        state = dismissState,
        modifier = Modifier.fillMaxWidth(),
        backgroundContent = {},
        enableDismissFromStartToEnd = true,
        enableDismissFromEndToStart = true
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(zebraBg)
        ) {
            when (expandMode) {
                ExpandMode.SRC -> Text(
                    text = srcText,
                    color = textColor,
                    fontSize = fontSizeSp.sp,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(start = 14.dp, end = 14.dp, top = 4.dp, bottom = 4.dp)
                )
                ExpandMode.TGT -> Text(
                    text = tgtText,
                    color = textColor,
                    fontSize = fontSizeSp.sp,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(start = 14.dp, end = 14.dp, top = 4.dp, bottom = 4.dp)
                )
                else -> TwoColumnTextRow(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(start = 14.dp, end = 4.dp, top = 4.dp, bottom = 4.dp),
                    dividerColor = dividerColor,
                    left = {
                        Text(
                            text = srcText,
                            color = textColor,
                            fontSize = fontSizeSp.sp,
                            modifier = Modifier.padding(end = 6.dp)
                        )
                    },
                    right = {
                        Text(
                            text = tgtText,
                            color = textColor,
                            fontSize = fontSizeSp.sp,
                            modifier = Modifier.padding(start = 6.dp)
                        )
                    }
                )
            }
        }
    }
}

/**
 * Two equal-width text columns with a hairline divider stretched to match whichever column is
 * taller — visually identical to `Row(Modifier.height(IntrinsicSize.Min))` with a weighted
 * divider, but each Text is measured exactly once instead of twice.
 *
 * `IntrinsicSize.Min` needs the min intrinsic height of both children *before* it can give the
 * Row a final height, which means Compose measures each Text a first time just to ask "how tall
 * would you be", then measures both again with that height locked in — a full extra text-layout
 * pass per row. On a list with thousands of rows of very different paragraph lengths, that
 * second pass was real, avoidable work happening on every row that scrolls into view.
 *
 * Here we measure the two texts once (their height is exactly what we need — no second guess
 * required), take the taller of the two, and only give the divider a height, since it's the one
 * element whose size genuinely depends on the others.
 */
@Composable
private fun TwoColumnTextRow(
    modifier: Modifier = Modifier,
    dividerColor: Color,
    left: @Composable () -> Unit,
    right: @Composable () -> Unit
) {
    val dividerWidthPx = with(LocalDensity.current) { 0.5.dp.roundToPx() }.coerceAtLeast(1)
    Layout(
        contents = listOf(
            left,
            { Box(Modifier.background(dividerColor)) },
            right
        ),
        modifier = modifier
    ) { (leftMeasurables, dividerMeasurables, rightMeasurables), constraints ->
        val leftMeasurable = leftMeasurables.first()
        val rightMeasurable = rightMeasurables.first()
        val dividerMeasurable = dividerMeasurables.first()

        val columnWidth = ((constraints.maxWidth - dividerWidthPx) / 2).coerceAtLeast(0)
        val columnConstraints = Constraints(
            minWidth = columnWidth,
            maxWidth = columnWidth,
            minHeight = 0,
            maxHeight = Constraints.Infinity
        )

        val leftPlaceable = leftMeasurable.measure(columnConstraints)
        val rightPlaceable = rightMeasurable.measure(columnConstraints)
        val rowHeight = maxOf(leftPlaceable.height, rightPlaceable.height)

        val dividerPlaceable = dividerMeasurable.measure(
            Constraints(
                minWidth = dividerWidthPx,
                maxWidth = dividerWidthPx,
                minHeight = rowHeight,
                maxHeight = rowHeight
            )
        )

        layout(constraints.maxWidth, rowHeight) {
            leftPlaceable.placeRelative(0, 0)
            dividerPlaceable.placeRelative(leftPlaceable.width, 0)
            rightPlaceable.placeRelative(leftPlaceable.width + dividerPlaceable.width, 0)
        }
    }
}
