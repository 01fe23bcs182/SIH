<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Login - SIH</title>
  <link rel="stylesheet" href="style.css">
</head>
<body data-page="login">
  <div class="container center">
    <h2>Login</h2>
    <form id="loginForm" class="card" style="max-width:420px;width:100%">
      <label>Role</label>
      <select name="role" required>
        <option value="student">Student</option>
        <option value="teacher">Teacher</option>
        <option value="admin">Admin</option>
      </select>
      <label>Name</label>
      <input type="text" name="name" required>
      <label>Class</label>
      <input type="text" name="cls" placeholder="ClassA">
      <label>Roll No (Students only)</label>
      <input type="text" name="roll">
      <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-primary" type="submit">Login</button>
        <a href="index.html" class="btn btn-outline" style="text-decoration:none;padding:8px 12px">Cancel</a>
      </div>
    </form>
  </div>

  <script src="app.js" defer></script>
</body>
</html>
