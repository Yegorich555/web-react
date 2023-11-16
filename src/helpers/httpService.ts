/* eslint-disable no-param-reassign */
import axios, { AxiosRequestConfig, AxiosResponse, AxiosResponseTransformer, CancelTokenSource } from "axios";

export interface IDownloadFile {
  id?: number;
  url: string;
  fileName: string;
}

export interface HttpRequestConfig extends AxiosRequestConfig {
  disableCatchErr?: boolean;
  cancelTokenKey?: string;
}

// const getUrl = (url: string): string => `http://localhost:40553${url}`;
const getUrl = (url: string): string => url;

function errorHandler<T>(fn: () => Promise<T>, config?: HttpRequestConfig) {
  return fn()
    .then((v) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (v as any)?.warningMessage as string;
      if (msg) {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        http.onWarning(msg);
      }
      return v;
    })
    .catch((err: Error & { response: AxiosResponse | null; isHandled: boolean }) => {
      let msg = "";
      if (!config?.disableCatchErr) {
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
        // eslint-disable-next-line no-param-reassign
        err.isHandled = true;
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        if (msg !== "Operation canceled by the user.") http.onError(msg);
      }
      throw err;
    });
}

const def: AxiosResponseTransformer[] = [];
if (axios.defaults.transformResponse) {
  if (Array.isArray(axios.defaults.transformResponse)) {
    def.push(...axios.defaults.transformResponse);
  } else {
    def.push(axios.defaults.transformResponse);
  }
}

axios.defaults.transformResponse = [
  ...def,
  function transformJsonDate(data, headers): unknown {
    // if ((headers["content-type"] as string)?.includes("json")) {
    //   return tryParseJSONDate(data);
    // }
    return data;
  },
];
axios.defaults.headers["Content-Type"] = "application/json";

const cancelMap = new Map<string, CancelTokenSource>();

function cancelPrevious(url: string) {
  const prevToken = cancelMap.get(url);
  if (prevToken) {
    prevToken.cancel();
    prevToken && cancelMap.delete(url);
  }

  const srcToken = axios.CancelToken.source();
  cancelMap.set(url, srcToken);
  return srcToken.token;
}

/** Ordinary httpServer as wrapper of Axios */
const http = {
  cancelAll: () => {
    const allTokens = Array.from(cancelMap.values());
    allTokens.forEach((x) => x.cancel());
  },

  get: <T>(url: string, config?: HttpRequestConfig) => errorHandler(() => axios.get<T>(getUrl(url), config), config),

  /** Get/post request based on arg [data] & cancel previous if it's not finished */
  search: <T>(url: string, data?: unknown, config?: HttpRequestConfig, extraCancelParam?: string) => {
    const method = data != null ? "post" : "get";
    config ??= {};
    config.cancelToken = cancelPrevious(`search${url}_${config.cancelTokenKey || ""}_${extraCancelParam || ""}`);
    return errorHandler(() => axios[method]<T>(getUrl(url), data, config), config);
  },

  /** Add new data/change security info */
  post: <T>(url: string, data?: unknown, config?: HttpRequestConfig) =>
    errorHandler(() => axios.post<T>(getUrl(url), data, config), config),

  /** Update existed data and cancel previous if it's not finished */
  put: <T>(url: string, data?: unknown, config?: HttpRequestConfig) => {
    const cancelToken = cancelPrevious(`put${url}_${config?.cancelTokenKey || ""}`);
    return errorHandler(() => axios.put<T>(getUrl(url), data, { ...config, cancelToken }), config);
  },

  /** Delete request */
  delete: <T>(url: string, config?: HttpRequestConfig) => errorHandler(() => axios.delete<T>(getUrl(url), config), config),

  onError: (errorMsg: string) => {
    console.error("Unhandled httpService errors", errorMsg);
  },
  onWarning: (msg: string) => {
    console.error("Unhandled httpService warnings", msg);
  },

  /** Download file by pointed URL with pointed URL; Point newFileName without file-extension */
  download: (url: string, newFileName?: string, preventSaveAs?: boolean, config?: HttpRequestConfig) => {
    const cfg: HttpRequestConfig = {
      ...config,
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
        if (!preventSaveAs) http.saveAs(blob, fileName);
        return blob;
      });
    } catch {
      throw new Error("Pointed file not found");
    }
  },

  /** Save blob to localDisk */
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
