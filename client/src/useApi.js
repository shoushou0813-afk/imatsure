import { useEffect, useState, useCallback } from "react";
import { api } from "./api";

/** GET専用の小さなデータ取得フック。読み込み中・エラー・再取得をまとめて扱う。 */
export function useApi(path, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    let alive = true;
    setLoading(true);
    api.get(path)
      .then((r) => alive && (setData(r.data), setError(null)))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [path]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => reload(), [path, ...deps]);

  return { data, error, loading, reload };
}
