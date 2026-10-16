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
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.runtime.setValue
import androidx.core.net.toUri
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.bilingreader.ui.theme.BilingReaderTheme
import com.example.bilingreader.ui.screen.LibraryScreen
import com.example.bilingreader.ui.screen.LibraryViewModel
import com.example.bilingreader.ui.screen.ReaderScreen
import com.example.bilingreader.ui.screen.ReaderViewModel

class MainActivity : ComponentActivity() {

    private var readerViewModel: ReaderViewModel? = null
    private var libraryViewModel: LibraryViewModel? = null
    private var isImportingToLibrary = false

    private val filePicker = registerForActivityResult(
        ActivityResultContracts.OpenDocument()
    ) { uri: Uri? ->
        uri?.let {
            contentResolver.takePersistableUriPermission(it, Intent.FLAG_GRANT_READ_URI_PERMISSION)
            if (isImportingToLibrary) {
                libraryViewModel?.importBook(it)
            } else {
                readerViewModel?.loadBook(it)
            }
        }
    }

    enum class Screen { Library, Reader }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        hideSystemNavBar()

        setContent {
            val rVM: ReaderViewModel = viewModel()
            val lVM: LibraryViewModel = viewModel()
            readerViewModel = rVM
            libraryViewModel = lVM

            var currentScreen by remember { mutableStateOf(Screen.Library) }
            val state by rVM.state.collectAsState()

            LaunchedEffect(Unit) { rVM.tryRestoreLastFile() }
            
            LaunchedEffect(state.book) {
                if (state.book != null) {
                    currentScreen = Screen.Reader
                }
            }

            BilingReaderTheme(darkTheme = state.isDarkTheme) {
                Surface(modifier = Modifier.fillMaxSize()) {
                    if (currentScreen == Screen.Library) {
                        LibraryScreen(
                            viewModel = lVM,
                            onOpenBook = { storedBook ->
                                rVM.loadBook(storedBook.uri.toUri())
                                currentScreen = Screen.Reader
                            },
                            onImportClick = {
                                isImportingToLibrary = true
                                filePicker.launch(arrayOf("*/*")) // Allow all, then parser will validate
                            },
                            onBack = { currentScreen = Screen.Reader }
                        )
                    } else {
                        ReaderScreen(
                            viewModel = rVM,
                            onLibraryClick = { currentScreen = Screen.Library }
                        )
                    }
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