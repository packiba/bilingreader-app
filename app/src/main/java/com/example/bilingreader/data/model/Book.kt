package com.example.bilingreader.data.model

data class AlignedPair(
    val src: String,
    val tgt: String
)

/**
 * Leaf chapter consumed by the reader UI (flat list of pages).
 *
 * [pathSrc] / [pathTgt] hold ancestor titles (excluding the leaf itself) so the UI can
 * show breadcrumbs or a hierarchical table of contents without walking the tree again.
 */
data class Chapter(
    val pairNum: Int,
    val titleSrc: String?,
    val titleTgt: String?,
    val pairs: List<AlignedPair>,
    val pathSrc: List<String> = emptyList(),
    val pathTgt: List<String> = emptyList()
) {
    /** Full display title for sidebar / breadcrumbs (ancestors + leaf). */
    fun displayTitleSrc(separator: String = " › "): String {
        val parts = pathSrc.filter { it.isNotBlank() } + listOfNotNull(titleSrc?.takeIf { it.isNotBlank() })
        return parts.joinToString(separator).ifBlank { "—" }
    }

    fun displayTitleTgt(separator: String = " › "): String {
        val parts = pathTgt.filter { it.isNotBlank() } + listOfNotNull(titleTgt?.takeIf { it.isNotBlank() })
        return parts.joinToString(separator).ifBlank { "—" }
    }
}

/**
 * Tree node matching the nested JSON book format:
 *
 * ```
 * book → chapter → subchapter(pairs)
 * ```
 *
 * Containers may nest arbitrarily; only nodes that carry a non-empty `pairs` array become
 * leaf [Chapter]s after flattening.
 */
sealed interface BookNode {
    val titleSrc: String?
    val titleTgt: String?
}

/** Intermediate node (type = "book", "chapter", or any other container without pairs). */
data class ContainerNode(
    val type: String,
    val number: Int? = null,
    override val titleSrc: String?,
    override val titleTgt: String?,
    val children: List<BookNode>
) : BookNode

/** Leaf node that holds the bilingual sentence pairs (type = "subchapter" or any node with pairs). */
data class ChapterNode(
    val number: Int? = null,
    override val titleSrc: String?,
    override val titleTgt: String?,
    val pairs: List<AlignedPair>
) : BookNode

data class Book(
    /** Original tree structure (may be empty when the file used the legacy flat format). */
    val roots: List<BookNode> = emptyList(),
    /** Flattened leaf chapters used by the reader, sidebar, and progress tracking. */
    val chapters: List<Chapter>
) {
    // Computed once and cached: totalPairs was being summed over every chapter on every
    // interaction (each swipe, each scroll settle, each slider release) even though the book's
    // contents never change after it's loaded.
    val totalPairs: Int by lazy(LazyThreadSafetyMode.NONE) { chapters.sumOf { it.pairs.size } }

    /**
     * Flat, O(1)-indexable view of every pair's Bulgarian ("tgt") text, in the same global pair
     * order used everywhere else in the reader (progress tracking, TTS continuous-reading
     * auto-advance). Built once and cached, same rationale as [totalPairs].
     */
    val bulgarianPairs: List<String> by lazy(LazyThreadSafetyMode.NONE) {
        chapters.flatMap { it.pairs }.map { it.tgt }
    }
}
