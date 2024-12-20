/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-param-reassign */
import tryParseJSONDate from "ytech-js-extensions/lib/object/tryParseJSONDate";

interface HttpResponse<T> extends Response {
  data: T;
}
interface HttpReqInit extends RequestInit {
  headers?: Record<string, string>;
}

type HttpReqData = BodyInit | Record<string, any>;

/** Wrapper of browser-fetch: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch */
export class HttpClient {
  static defaults: HttpReqInit = {
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
    },
  };

  /** Returns whether it if ordinary object or another one */

  protected isPlainObject(obj: any) {
    return typeof obj === "object" && ![ReadableStream, Blob, ArrayBuffer, FormData, URLSearchParams].some((t) => obj instanceof t);
  }

  protected async fetch<T>(
    method: "GET" | "PUT" | "POST" | "DELETE",
    url: string | RequestInfo,
    data: unknown,
    cfg: HttpReqInit | undefined,
  ): Promise<HttpResponse<T>> {
    // cast to JSON string if possible
    if (data && (!cfg?.headers || !cfg.headers["content-type"])) {
      if (this.isPlainObject(data)) {
        cfg ??= {};
        cfg.body = JSON.stringify(data);
      }
    }

    cfg = {
      ...HttpClient.defaults,
      method,
      ...cfg,
      headers: { ...HttpClient.defaults.headers, ...cfg?.headers },
    };

    try {
      const res = (await fetch(url, cfg)) as HttpResponse<T>;
      // cast to JSON
      const h = res.headers.get("content-type");
      if (h?.startsWith("application/json")) {
        res.data = await res.json();
        res.data = tryParseJSONDate(res.data); // Find & convert all Date-strings to Date-object
      } /* else if (h?.startsWith("text")) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        res.data = (await res.text()) as any;
      }*/
      if (!res.ok) {
        console.error(res);
        const msg = (res.data as any)?.message || res.data || `${res.status} ${res.statusText}`;
        const err = new Error(msg);
        (err as any).details = res;
        return Promise.reject(err);
      }
      // res.headers.forEach(console.warn);
      return res;
    } catch (err) {
      // error when no internet connection
      console.error(err);
      return Promise.reject(err);
    }
  }

  /** GET request */
  get<T>(url: string | RequestInfo, cfg?: HttpReqInit): Promise<HttpResponse<T>> {
    return this.fetch<T>("GET", url, null, cfg);
  }

  /** Add new data/change security info */
  post<T>(url: string, data?: HttpReqData, cfg?: HttpReqInit): Promise<HttpResponse<T>> {
    return this.fetch<T>("POST", url, data, cfg);
  }

  /** Update existed data and cancel previous if it's not finished */
  put<T>(url: string, data?: HttpReqData, cfg?: HttpReqInit): Promise<HttpResponse<T>> {
    // todo add canceling
    return this.fetch<T>("PUT", url, data, cfg);
  }

  /** DELETE request */
  delete<T>(url: string, cfg?: HttpReqInit): Promise<HttpResponse<T>> {
    return this.fetch<T>("DELETE", url, null, cfg);
  }

  cancelAll(): void {
    console.warn("todo implement");
  }

  /** Save blob to local disk/storage */
  saveAs(blob: Blob, fileName: string) {
    const href = window.URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.setAttribute("href", href);
    el.setAttribute("download", fileName || "downloadedFile");
    el.click();

    return new Promise<void>((res) => {
      setTimeout(() => {
        el.remove();
        window.URL.revokeObjectURL(href);
        res();
      }, 100);
    });
  }

  /** Download file with pointed URL; WARN: point newFileName without file-extension */
  async download(url: string, newFileName?: string, preventSaveAs?: boolean, cfg?: HttpReqInit): Promise<Blob> {
    cfg = {
      credentials: "omit",
      ...cfg,
    };

    try {
      const res = await this.get<File>(url, cfg);
      let fileName: string;
      if (!newFileName) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const h = res.headers.get("content-disposition");
        const matches = h && filenameRegex.exec(h);
        fileName = (matches && matches[1].replace(/['"]/g, "")) || "";
      } else {
        fileName = newFileName;
      }

      // const blob = new Blob([res.data], { type: res.headers.get("content-type")! });
      const blob = await res.blob();
      !preventSaveAs && this.saveAs(blob, fileName);
      return blob;
    } catch {
      throw new Error("Pointed file not found");
    }
  }
}

const http = new HttpClient();
export default http;

// todo test download
// todo test cancelling
