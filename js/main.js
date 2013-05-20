function Init( data )
{
  if (data.uid == 0)
    SimpleApiRequest("api/login");
}
