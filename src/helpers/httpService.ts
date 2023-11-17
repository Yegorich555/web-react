/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-param-reassign */
import axios, { AxiosRequestConfig, AxiosResponse, AxiosResponseTransformer, CancelTokenSource } from "axios";
import tryParseJSONDate from "ytech-js-extensions/lib/object/tryParseJSONDate";

// export interface IDownloadFile {
//   id?: number;
//   url: string;
//   fileName: string;
// }

export interface HttpRequestConfig extends AxiosRequestConfig {
  /** Set true so disable default error handler and catch exception manually via .catch */
  disableCatchErr?: boolean;
}

// configure defaults: https://axios-http.com/docs/config_defaults
// axios.defaults.baseURL = "https://api.example.com";
(axios.defaults.transformResponse as AxiosResponseTransformer[]).push((data, headers) => {
  if ((headers["content-type"] as string)?.includes("json")) {
    return tryParseJSONDate(data);
  }
  return data;
});
axios.defaults.headers["Content-Type"] = "application/json";

function errorHandler<T>(req: Promise<T>, cfg?: HttpRequestConfig) {
  if (cfg?.disableCatchErr) {
    return req;
  }
  return req.catch((err: Error & { response: AxiosResponse | null; _isHandled: boolean }) => {
    let msg = "";
    if (err.response) {
      const res = err.response as AxiosResponse;
      if (res.data?.errorMessage) {
        // expected message from backend
        msg = res.data.errorMessage;
      } else {
        msg = err.message;
        if (res.config.url) {
          msg += ` in ${res.config.method?.toUpperCase()} ${res.config.url}`;
        }
      }
    }
    if (!msg) {
      msg = err.message;
    }
    err._isHandled = true;
    // todo wrap it in proper way
    if (msg !== "Operation canceled by the user.") http.onError(msg);

    throw err;
  });
}

// handling of cancellation token
const cancelMap = new Map<string, CancelTokenSource>(); // todo memory leak here: need to clear when request finished

/** Ordinary httpClient as wrapper of Axios */
const http = {
  /** Immediately cancel all started requests */
  cancelAll: () => {
    const allTokens = Array.from(cancelMap.values());
    allTokens.forEach((x) => x.cancel());
  },
  /** Find request by token & cancel it */
  cancel: (cancelToken: string) => {
    const p = cancelMap.get(cancelToken);
    if (p) {
      p.cancel();
      p && cancelMap.delete(cancelToken);
    }
  },
  /** Find request by token & cancel it & create new token for next request */
  cancelPrev: (cancelToken: string) => {
    http.cancel(cancelToken);

    const st = axios.CancelToken.source();
    cancelMap.set(cancelToken, st);
    return st.token;
  },

  /** Get request */
  get: <T>(url: string, config?: HttpRequestConfig) => errorHandler(axios.get<T>(url, config), config),

  /** Get/post request based on arg [data] + cancel previous if it's not finished */
  search: <T>(url: string, data?: unknown, cfg?: HttpRequestConfig) => {
    const method = data != null ? "post" : "get";
    cfg = {
      ...cfg,
      cancelToken: cfg?.cancelToken ?? http.cancelPrev(`_search${url}`),
    };
    return errorHandler(axios[method]<T>(url, data, cfg), cfg);
  },

  /** Add new data/change security info */
  post: <T>(url: string, data?: unknown, cfg?: HttpRequestConfig) => errorHandler(axios.post<T>(url, data, cfg), cfg),

  /** Update existed data and cancel previous if it's not finished */
  put: <T>(url: string, data?: unknown, cfg?: HttpRequestConfig) => {
    cfg = {
      ...cfg,
      cancelToken: cfg?.cancelToken ?? http.cancelPrev(`_put${url}`),
    };
    return errorHandler(axios.put<T>(url, data, cfg), cfg);
  },

  /** Delete request */
  delete: <T>(url: string, cfg?: HttpRequestConfig) => errorHandler(axios.delete<T>(url, cfg), cfg),

  // todo re-use it in global handler
  onError: (errorMsg: string) => {
    console.error("Unhandled httpService errors", errorMsg);
  },

  /** Download file with pointed URL; WARN: point newFileName without file-extension */
  download: (url: string, newFileName?: string, preventSaveAs?: boolean, cfg?: HttpRequestConfig) => {
    cfg = {
      ...cfg,
      responseType: "blob", // 'blob' is important for properly converting by axios
      withCredentials: false,
    };

    try {
      return http.get<File>(url, cfg).then((res) => {
        let fileName = newFileName;
        if (!fileName) {
          const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
          const matches = filenameRegex.exec(res.headers["content-disposition"]);
          fileName = (matches && matches[1].replace(/['"]/g, "")) || "";
        }

        const blob = new Blob([res.data], { type: res.headers["content-type"] });
        !preventSaveAs && http.saveAs(blob, fileName);
        return blob;
      });
    } catch {
      throw new Error("Pointed file not found");
    }
  },

  /** Save blob to local disk/storage */
  saveAs: (blob: Blob, fileName: string) => {
    const href = window.URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.setAttribute("href", href);
    el.setAttribute("download", fileName || "downloadedFile");
    el.click();

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        el.remove();
        window.URL.revokeObjectURL(href);
        resolve();
      }, 100);
    });
  },

  // uncomment & install jszip for usage
  /** Download pointed files and zip-archive; @archiveName without extension */
  // downloadAndZip: async (fileUrls: IDownloadFile[], archiveName: string) => {
  //   // eslint-disable-next-line new-cap
  //   const zip = new (await import("jszip")).default();
  //   const folder = zip.folder(archiveName);
  //   if (folder == null) {
  //     throw new Error("Failed upload files attempt");
  //   }

  //   let duplicatedNamesCount = 1;
  //   for (let i = 0; i < fileUrls.length; i++) {
  //     let u = fileUrls[i];
  //     // eslint-disable-next-line no-await-in-loop
  //     const blob = await httpService.download(u.url, u.fileName, true);

  //     if (
  //       fileUrls
  //         .filter((x) => x.id !== u.id)
  //         .map((v) => v.fileName)
  //         .includes(u.fileName)
  //     ) {
  //       u = { ...u, fileName: `(${duplicatedNamesCount})${u.fileName}` };
  //       ++duplicatedNamesCount;
  //     }

  //     folder.file(u.fileName, blob);
  //   }

  //   folder.generateAsync({ type: "blob" }).then((content: Blob) => {
  //     httpService.saveAs(content, `${archiveName}.zip`);
  //   });
  // },
};

export default http;
