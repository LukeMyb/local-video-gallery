import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">動画一覧</h1>
      <Link to="/player/test_id" className="text-blue-500 underline">
        プレイヤー画面へテスト遷移
      </Link>
    </div>
  );
}

export default Home;