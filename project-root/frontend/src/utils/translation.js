const TRANSLATE_API_URL = "https://translation-api.translate.com/api/translate";
const API_KEY = "167585088f329b"; // Reemplaza con tu clave API

export async function translateText(text, sourceLang, targetLang) {
    try {
        const response = await fetch(TRANSLATE_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`,
            },
            body: JSON.stringify({
                text,
                source_language: sourceLang,
                target_language: targetLang,
            }),
        });

        if (!response.ok) {
            throw new Error("Error en la API de traducción");
        }

        const data = await response.json();
        return data.translation;
    } catch (error) {
        console.error("Error al traducir:", error);
        return null;
    }
}
