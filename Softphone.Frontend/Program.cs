using ElmahCore.Mvc;
using ElmahCore;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using Softphone.Frontend.Services;
using Supabase;

var builder = WebApplication.CreateBuilder(args);

if (builder.Environment.IsDevelopment())
{
    builder.Services.AddRazorPages().AddRazorRuntimeCompilation();
}

builder.Services.AddControllers().AddNewtonsoftJson(o => { o.SerializerSettings.ReferenceLoopHandling = ReferenceLoopHandling.Ignore; });
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme).AddCookie(o => o.LoginPath = new PathString("/Security/Login"));
builder.Services.AddControllersWithViews(o => o.Filters.Add(new AutoValidateAntiforgeryTokenAttribute()));
builder.Services.AddElmah<XmlFileErrorLog>(o => { o.LogPath = "~/elmah_logs"; });

builder.Services.AddScoped<Client>(_ =>
    new Client(
        builder.Configuration["SupabaseUrl"],
        builder.Configuration["SupabaseKey"],
        new SupabaseOptions { AutoRefreshToken = true, AutoConnectRealtime = true }
    ));

builder.Services.AddTransient<ISettingsService, SettingsService>();
builder.Services.AddTransient<IWorkspaceService, WorkspaceService>();
builder.Services.AddTransient<IUserService, UserService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();
app.UseElmah();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();
