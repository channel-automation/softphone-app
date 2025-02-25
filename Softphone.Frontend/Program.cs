using ElmahCore;
using ElmahCore.Mvc;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using Softphone.Frontend.Services;
using Supabase;
using Newtonsoft.Json;

// Add services to the container.
var builder = WebApplication.CreateBuilder(args);

if (builder.Environment.IsDevelopment())
{
    builder.Services.AddRazorPages().AddRazorRuntimeCompilation();
}

builder.Services.AddControllers().AddNewtonsoftJson(o => { o.SerializerSettings.ReferenceLoopHandling = ReferenceLoopHandling.Ignore; });
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme).AddCookie(o => o.LoginPath = new PathString("/Login"));
builder.Services.AddRazorPages();
builder.Services.AddMvc(o => o.Filters.Add(new AutoValidateAntiforgeryTokenAttribute()));
builder.Services.AddElmah<XmlFileErrorLog>(o => { o.LogPath = "~/elmah_logs"; });

builder.Services.AddScoped<Client>(_ =>
    new Client(
        builder.Configuration["SupabaseUrl"],
        builder.Configuration["SupabaseKey"],
        new SupabaseOptions { AutoRefreshToken = true, AutoConnectRealtime = true }
    ));

builder.Services.AddTransient<IWorkspaceService, WorkspaceService>();
builder.Services.AddTransient<IUserService, UserService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();
app.UseElmah();

app.MapRazorPages();
app.Run();