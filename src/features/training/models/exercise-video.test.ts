import { getExerciseVideo, getYouTubeEmbedHtml } from "./exercise-video";

describe("videos de ejercicios", () => {
  it.each([
    "https://www.youtube.com/watch?v=U9OPHAlIicw",
    "https://youtube.com/watch?v=U9OPHAlIicw&t=30s",
    "https://m.youtube.com/watch?v=U9OPHAlIicw",
    "https://youtu.be/U9OPHAlIicw?si=abc",
    "https://www.youtube.com/shorts/U9OPHAlIicw",
    "https://www.youtube.com/embed/U9OPHAlIicw",
  ])("reconoce el video de YouTube %s", (url) => {
    expect(getExerciseVideo(url)).toEqual({ kind: "youtube", url, videoId: "U9OPHAlIicw" });
  });

  it("reproduce archivos de video y subidas de Cloudinary con el reproductor nativo", () => {
    expect(getExerciseVideo("https://cdn.titanium.com/videos/press.MP4")?.kind).toBe("file");
    expect(
      getExerciseVideo("https://res.cloudinary.com/dqf9pdcte/video/upload/v1/titanium/press")?.kind,
    ).toBe("file");
  });

  it("abre otras páginas en el navegador", () => {
    expect(getExerciseVideo("https://vimeo.com/123456")).toEqual({
      kind: "link",
      url: "https://vimeo.com/123456",
    });
    expect(getExerciseVideo("https://www.youtube.com/channel/UC123")?.kind).toBe("link");
  });

  it("rechaza enlaces vacíos, inválidos o sin https", () => {
    expect(getExerciseVideo(null)).toBeNull();
    expect(getExerciseVideo("no es un enlace")).toBeNull();
    expect(getExerciseVideo("http://www.youtube.com/watch?v=U9OPHAlIicw")).toBeNull();
    expect(getExerciseVideo("javascript:alert(1)")).toBeNull();
  });

  it("incrusta solo el id validado del video", () => {
    const html = getYouTubeEmbedHtml("U9OPHAlIicw");
    expect(html).toContain("https://www.youtube-nocookie.com/embed/U9OPHAlIicw?playsinline=1");
    expect(html).toContain('referrerpolicy="strict-origin-when-cross-origin"');
  });
});
