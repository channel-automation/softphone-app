namespace Softphone.Frontend.Models
{
    public class Paged<T>
    {
        public int RecordsTotal { get; set; }
        public IList<T> Data { get; set; }
    }
}
