import { useParams, Link } from 'react-router-dom';

function Player() {
  const { id } = useParams();

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">プレイヤー画面</h1>
      <p className="mb-4">取得した動画ID: {id}</p>
      <Link to="/" className="text-blue-500 underline">
        一覧に戻る
      </Link>
    </div>
  );
}

export default Player;