package com.example.bilingreader.data.parser

import com.example.bilingreader.data.model.AlignedPair
import com.example.bilingreader.data.model.Book
import com.example.bilingreader.data.model.Chapter
import org.json.JSONArray
import java.io.InputStream

object BookParser {
    fun parse(inputStream: InputStream): Book {
        val text = inputStream.bufferedReader().use { it.readText() }
        val jsonArray = JSONArray(text)
        val chapters = mutableListOf<Chapter>()

        for (i in 0 until jsonArray.length()) {
            val obj = jsonArray.getJSONObject(i)
            val pairsArray = obj.getJSONArray("pairs")
            val pairs = mutableListOf<AlignedPair>()
            for (j in 0 until pairsArray.length()) {
                val p = pairsArray.getJSONObject(j)
                pairs.add(AlignedPair(
                    src = p.getString("src"),
                    tgt = p.getString("tgt")
                ))
            }
            chapters.add(Chapter(
                pairNum = obj.getInt("pair_num"),
                titleSrc = obj.optString("title_src", null)?.ifBlank { null },
                titleTgt = obj.optString("title_tgt", null)?.ifBlank { null },
                pairs = pairs
            ))
        }
        return Book(chapters = chapters)
    }
}
