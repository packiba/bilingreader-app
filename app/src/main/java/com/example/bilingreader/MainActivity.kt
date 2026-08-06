package com.example.bilingreader

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.bilingreader.ui.theme.BilingReaderTheme
import com.example.bilingreader.ui.screen.ReaderScreen
import com.example.bilingreader.ui.screen.ReaderViewModel

class MainActivity : ComponentActivity() {

    private var currentViewModel: ReaderViewModel? = null

    private val filePicker = registerForActivityResult(
        ActivityResultContracts.OpenDocument()
    ) { uri: Uri? ->
        uri?.let {
            contentResolver.takePersistableUriPermission(it, Intent.FLAG_GRANT_READ_URI_PERMISSION)
            currentViewModel?.loadBook(it)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        hideSystemNavBar()

        setContent {
            val viewModel: ReaderViewModel = viewModel()
            currentViewModel = viewModel

            LaunchedEffect(Unit) { viewModel.tryRestoreLastFile() }

            val state by viewModel.state.collectAsState()
            BilingReaderTheme(darkTheme = state.isDarkTheme) {
                Surface(modifier = Modifier.fillMaxSize()) {
                    ReaderScreen(
                        viewModel = viewModel,
                        onFilePick = { filePicker.launch(arrayOf("application/json")) }
                    )
                }
            }
        }
    }

    fun hideSystemNavBar() {
        if (Build.VERSION.SDK_INT >= 30) {
            window.insetsController?.let { c ->
                c.hide(WindowInsets.Type.navigationBars() or WindowInsets.Type.statusBars())
                c.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                View.SYSTEM_UI_FLAG_FULLSCREEN or
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            )
        }
    }
}