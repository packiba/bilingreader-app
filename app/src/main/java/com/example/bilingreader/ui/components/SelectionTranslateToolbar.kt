package com.example.bilingreader.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.ClipboardManager
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.TextToolbar
import androidx.compose.ui.platform.TextToolbarStatus
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Popup
import androidx.compose.ui.window.PopupProperties

/**
 * A custom [TextToolbar] that replaces the system selection menu with a Compose-based one,
 * allowing us to add a "Translate" button.
 */
class SelectionTranslateToolbar(
    private val clipboardManager: ClipboardManager,
    private val onTranslateRequested: (String) -> Unit
) : TextToolbar {
    private var _status by mutableStateOf(TextToolbarStatus.Hidden)
    override val status: TextToolbarStatus get() = _status

    private var menuRect by mutableStateOf(Rect.Zero)
    private var onCopy by mutableStateOf<(() -> Unit)?>(null)
    private var onSelectAll by mutableStateOf<(() -> Unit)?>(null)

    override fun hide() {
        _status = TextToolbarStatus.Hidden
    }

    override fun showMenu(
        rect: Rect,
        onCopyRequested: (() -> Unit)?,
        onPasteRequested: (() -> Unit)?,
        onCutRequested: (() -> Unit)?,
        onSelectAllRequested: (() -> Unit)?
    ) {
        menuRect = rect
        onCopy = onCopyRequested
        onSelectAll = onSelectAllRequested
        _status = TextToolbarStatus.Shown
    }

    private fun handleTranslate() {
        onCopy?.invoke()
        // ML Kit translation works with phrases. We get text from clipboard after onCopy call.
        val text = clipboardManager.getText()?.text
        if (!text.isNullOrBlank()) {
            onTranslateRequested(text)
        }
        hide()
    }
    
    @Composable
    fun Content(isDarkTheme: Boolean, parentGlobalOffset: IntOffset) {
        if (_status == TextToolbarStatus.Hidden) return

        val bg = if (isDarkTheme) Color(0xFF2D333B) else Color(0xFFFFFFFF)
        val textColor = if (isDarkTheme) Color(0xFFE6EDF3) else Color(0xFF1A1E24)
        val density = LocalDensity.current
        
        val popupOffset = remember(menuRect, density, parentGlobalOffset) {
            val yOffset = with(density) { 64.dp.roundToPx() }
            IntOffset(
                (menuRect.left - parentGlobalOffset.x).toInt(),
                (menuRect.top - parentGlobalOffset.y - yOffset).toInt()
            )
        }

        Popup(
            offset = popupOffset,
            onDismissRequest = { hide() },
            // focusable = false is important to let selection handles work.
            // But we need to make sure the popup itself is still touchable.
            properties = PopupProperties(
                focusable = false,
                dismissOnClickOutside = true,
                dismissOnBackPress = true
            )
        ) {
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = bg,
                shadowElevation = 8.dp,
                modifier = Modifier
                    .padding(4.dp)
                    // Explicitly make the surface clickable to catch events even if focusable is false
                    .clickable(enabled = false) {} 
            ) {
                Row(modifier = Modifier.padding(horizontal = 4.dp)) {
                    if (onCopy != null) {
                        TextButton(onClick = { onCopy?.invoke(); hide() }) {
                            Text("Копировать", color = textColor, fontSize = 14.sp)
                        }
                    }
                    TextButton(onClick = { handleTranslate() }) {
                        Text("Перевести", color = textColor, fontSize = 14.sp)
                    }
                    if (onSelectAll != null) {
                        TextButton(onClick = { onSelectAll?.invoke(); hide() }) {
                            Text("Выбрать всё", color = textColor, fontSize = 14.sp)
                        }
                    }
                }
            }
        }
    }
}
