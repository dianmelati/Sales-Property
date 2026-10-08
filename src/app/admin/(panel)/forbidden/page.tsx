export const metadata = { title: "No access" };

export default function Forbidden() {
  return (
    <div className="max-w-md">
      <h1 className="text-4xl">You do not have access</h1>
      <p className="mt-4 text-mist">Your role cannot open this section. Ask a super admin to change your role if you need it.</p>
    </div>
  );
}
